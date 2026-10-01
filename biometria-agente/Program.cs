using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using NITGEN.SDK.NBioBSP;

namespace BiometriaAgente
{
    // Agente local do Hamster DX: o portal (no navegador) não enxerga USB, então ele chama este programa em
    // http://localhost:9001. Só atende a própria máquina e só aceita pedidos vindos do site do portal.
    //
    //   GET  /status  -> { ok, device }                         leitor conectado?
    //   POST /enroll  -> { ok, template }                       cadastra a digital (o SDK pede o dedo várias vezes)
    //   POST /verify  { template } -> { ok, match }             colaborador põe o dedo e compara com o cadastro
    //
    // "template" é o FIR do Nitgen em texto: um modelo matemático da digital, não a imagem do dedo.
    internal static class Program
    {
        private const string Prefix = "http://localhost:9001/";
        private const int MaxBodyBytes = 64 * 1024;
        // NBioAPIERROR_CAPTURE_TIMEOUT = NBioAPIERROR_BASE_UI (0x0200) + 0x03 (manual, A.2.3).
        private const uint CaptureTimeout = 0x0203;

        private static readonly HashSet<string> AllowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "https://www.admdf.site",
            "https://admdf.site"
        };

        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = MaxBodyBytes };
        private static readonly FingerprintWorker Worker = new FingerprintWorker();

        private static void Main()
        {
            // Para testar o site rodando no próprio PC (ex.: Live Server), defina BIOMETRIA_DEV_ORIGINS=http://127.0.0.1:5500
            var devOrigins = Environment.GetEnvironmentVariable("BIOMETRIA_DEV_ORIGINS") ?? "";
            foreach (var origin in devOrigins.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
                AllowedOrigins.Add(origin.Trim().TrimEnd('/'));

            var listener = new HttpListener();
            listener.Prefixes.Add(Prefix);
            try
            {
                listener.Start();
            }
            catch (HttpListenerException error)
            {
                Console.WriteLine($"Não foi possível abrir {Prefix}: {error.Message}");
                Console.WriteLine("Confira se o agente já não está aberto em outra janela.");
                Console.ReadKey();
                return;
            }

            Console.WriteLine($"Agente biométrico ativo em {Prefix}");
            Console.WriteLine("Sites permitidos: " + string.Join(", ", AllowedOrigins));
            Console.WriteLine("Deixe esta janela aberta enquanto usar o leitor. Ctrl+C para encerrar.");

            while (listener.IsListening)
            {
                HttpListenerContext context;
                try { context = listener.GetContext(); }
                catch (HttpListenerException) { break; }
                Task.Run(() => Handle(context));
            }
        }

        private static void Handle(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            try
            {
                var origin = (request.Headers["Origin"] ?? "").TrimEnd('/');
                if (!AllowedOrigins.Contains(origin))
                {
                    // Sem isso, qualquer site aberto no navegador poderia acionar o leitor.
                    Reply(response, 403, new { ok = false, error = "origem-nao-permitida" });
                    return;
                }

                response.Headers["Access-Control-Allow-Origin"] = origin;
                response.Headers["Vary"] = "Origin";
                response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
                response.Headers["Access-Control-Allow-Headers"] = "Content-Type";
                // Chrome: site público chamando localhost exige este aviso (Private Network Access).
                response.Headers["Access-Control-Allow-Private-Network"] = "true";

                if (request.HttpMethod == "OPTIONS")
                {
                    Reply(response, 204, null);
                    return;
                }

                var path = request.Url.AbsolutePath.TrimEnd('/').ToLowerInvariant();
                switch ($"{request.HttpMethod} {path}")
                {
                    case "GET /status":
                        Reply(response, 200, Worker.Run(api => new { ok = true, device = DeviceAvailable(api) }));
                        break;
                    case "POST /enroll":
                        Reply(response, 200, Worker.Run(Enroll));
                        break;
                    case "POST /verify":
                        var body = ReadBody(request);
                        var template = body != null && body.TryGetValue("template", out var value) ? value as string : null;
                        if (string.IsNullOrWhiteSpace(template))
                        {
                            Reply(response, 400, new { ok = false, error = "template-ausente" });
                            break;
                        }
                        Reply(response, 200, Worker.Run(api => Verify(api, template)));
                        break;
                    default:
                        Reply(response, 404, new { ok = false, error = "rota-inexistente" });
                        break;
                }
            }
            catch (Exception error)
            {
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Erro: {error.Message}");
                Reply(response, 500, new { ok = false, error = "falha-interna" });
            }
        }

        private static bool DeviceAvailable(NBioAPI api)
        {
            var ret = api.OpenDevice(NBioAPI.Type.DEVICE_ID.AUTO);
            if (ret != NBioAPI.Error.NONE) return false;
            api.CloseDevice(NBioAPI.Type.DEVICE_ID.AUTO);
            return true;
        }

        private static object Enroll(NBioAPI api)
        {
            var ret = api.OpenDevice(NBioAPI.Type.DEVICE_ID.AUTO);
            if (ret != NBioAPI.Error.NONE) return new { ok = false, error = "leitor-desconectado", code = ret };
            try
            {
                ret = api.Enroll(out NBioAPI.Type.HFIR enrolled, null);
                if (ret == NBioAPI.Error.USER_CANCEL) return new { ok = false, error = "cancelado" };
                if (ret == CaptureTimeout) return new { ok = false, error = "tempo-esgotado" };
                if (ret != NBioAPI.Error.NONE) return new { ok = false, error = "falha-captura", code = ret };

                api.GetTextFIRFromHandle(enrolled, out NBioAPI.Type.FIR_TEXTENCODE text, true);
                Log("Digital cadastrada.");
                return new { ok = true, template = text.TextFIR };
            }
            finally
            {
                api.CloseDevice(NBioAPI.Type.DEVICE_ID.AUTO);
            }
        }

        private static object Verify(NBioAPI api, string template)
        {
            var ret = api.OpenDevice(NBioAPI.Type.DEVICE_ID.AUTO);
            if (ret != NBioAPI.Error.NONE) return new { ok = false, error = "leitor-desconectado", code = ret };
            try
            {
                var stored = new NBioAPI.Type.FIR_TEXTENCODE { TextFIR = template, IsWideChar = true };
                // Verify captura o dedo e compara 1:1 com o modelo salvo (manual, 7.4 / C.1.3).
                ret = api.Verify(stored, out bool match, new NBioAPI.Type.FIR_PAYLOAD());
                if (ret == NBioAPI.Error.USER_CANCEL) return new { ok = false, error = "cancelado" };
                if (ret == CaptureTimeout) return new { ok = false, error = "tempo-esgotado" };
                if (ret != NBioAPI.Error.NONE) return new { ok = false, error = "falha-captura", code = ret };

                Log(match ? "Digital conferida: confere." : "Digital conferida: NÃO confere.");
                return new { ok = true, match };
            }
            finally
            {
                api.CloseDevice(NBioAPI.Type.DEVICE_ID.AUTO);
            }
        }

        private static Dictionary<string, object> ReadBody(HttpListenerRequest request)
        {
            if (request.ContentLength64 > MaxBodyBytes) throw new InvalidDataException("Corpo grande demais.");
            using (var reader = new StreamReader(request.InputStream, Encoding.UTF8))
            {
                var buffer = new char[MaxBodyBytes + 1];
                var read = reader.ReadBlock(buffer, 0, buffer.Length);
                if (read > MaxBodyBytes) throw new InvalidDataException("Corpo grande demais.");
                return Json.Deserialize<Dictionary<string, object>>(new string(buffer, 0, read));
            }
        }

        private static void Reply(HttpListenerResponse response, int status, object body)
        {
            response.StatusCode = status;
            if (body != null)
            {
                var bytes = Encoding.UTF8.GetBytes(Json.Serialize(body));
                response.ContentType = "application/json; charset=utf-8";
                response.ContentLength64 = bytes.Length;
                response.OutputStream.Write(bytes, 0, bytes.Length);
            }
            response.Close();
        }

        private static void Log(string message) => Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] {message}");
    }

    // O SDK da Nitgen mostra janelas próprias (captura/cadastro) e precisa de uma thread STA. Todas as chamadas
    // passam por esta única thread, uma de cada vez: o leitor só atende um dedo por vez.
    internal sealed class FingerprintWorker
    {
        private readonly BlockingCollection<Action<NBioAPI>> _queue = new BlockingCollection<Action<NBioAPI>>();

        public FingerprintWorker()
        {
            var thread = new Thread(() =>
            {
                var api = new NBioAPI();
                foreach (var job in _queue.GetConsumingEnumerable()) job(api);
            }) { IsBackground = true, Name = "NBioBSP" };
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
        }

        public object Run(Func<NBioAPI, object> job)
        {
            var done = new TaskCompletionSource<object>();
            _queue.Add(api =>
            {
                try { done.SetResult(job(api)); }
                catch (Exception error) { done.SetException(error); }
            });
            return done.Task.GetAwaiter().GetResult();
        }
    }
}
