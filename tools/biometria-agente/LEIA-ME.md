# Agente biométrico (Hamster DX)

O portal roda no navegador e o navegador não acessa o leitor USB. Este programa fica aberto no computador
onde o Hamster DX está ligado e faz a ponte: o portal chama `http://localhost:9001` e o agente usa o SDK
da Nitgen para ler a digital.

Só funciona no **computador com o leitor**. Nos celulares, a liberação continua sem a digital.

## 1. Instalar o leitor (uma vez por computador)

1. Instale o **driver do Hamster DX** (UBio-Hamster X Driver / UnionCommunity).
2. Instale o **eNBSP (NBioBSP) SDK** da Fingertech. O instalador pede um **número de série**, que vem
   com o SDK. Use uma versão recente: o manual 4.30 (2005) lista só leitores antigos (FDU01, FDU11…) e
   o Hamster DX aparece no Windows como **HFDU06**.
   - Quando o instalador perguntar pela "Class Library for .NET", responda **Sim**. Ela também pode
     ser instalada depois pelo `dotNET\Setup\NBioBSP.NET_Setup.msi`, dentro da pasta do SDK.
3. Abra o **NBioBSPDemo.exe** (pasta `Bin` do SDK), clique em **Open** com "Auto_Detect" e depois em
   **Enroll**. Se o leitor capturar a digital, está tudo pronto.

> Cada computador que usar o leitor precisa ter `NBioBSP.dll` na pasta do sistema, o que o instalador
> do SDK já faz (manual, Apêndice E).

## 2. Compilar o agente (uma vez, em qualquer PC com o SDK)

1. Copie `NITGEN.SDK.NBioBSP.dll` da pasta `dotNET` do SDK (o padrão é
   `C:\Program Files\NITGEN eNBSP\SDK\dotNET\` ou `C:\Program Files (x86)\...`) para
   `tools\biometria-agente\lib\`.
2. Instale o [.NET SDK](https://dotnet.microsoft.com/download) e o Developer Pack do .NET Framework 4.8.
3. Nesta pasta, rode:

   ```
   dotnet publish -c Release -o publicado
   ```

4. A pasta `publicado\` é o que vai para os computadores com leitor.

> O SDK instalado é de 64 bits? Troque `PlatformTarget` para `x64` no `.csproj`.

## 3. Usar no dia a dia

- Abra `publicado\BiometriaAgente.exe` e deixe a janela aberta.
- Para abrir sozinho ao ligar o PC: `Win + R` → `shell:startup` → cole ali um atalho do `.exe`.
- Na primeira vez, o Chrome/Edge pode perguntar se o site pode **acessar dispositivos da rede local**.
  Escolha **Permitir**.

## Segurança

- O agente só escuta a própria máquina (`localhost`) e só responde ao site `https://www.admdf.site`.
  Para testar localmente, defina a variável `BIOMETRIA_DEV_ORIGINS=http://127.0.0.1:5500`.
- O agente não guarda nenhuma digital. Ele devolve o modelo (FIR) ao portal no cadastro e compara na
  assinatura.
- A digital é **dado pessoal sensível (LGPD, art. 11)**. Cadastre somente com autorização do colaborador.
  O portal registra a data do consentimento.
