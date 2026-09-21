(() => {
  const employeesCollection = () => window.portalFirebaseDb.collection(window.portalDataModel?.collections?.employees || "employees");
  const allowedCollection = () => window.portalFirebaseDb.collection(window.portalDataModel?.collections?.allowedRegistrations || "allowedRegistrations");

  function normalizeRegistration(matricula) {
    return String(matricula || "").replace(/\D/g, "").slice(0, 7);
  }

  window.portalEmployeeStore = Object.freeze({
    async getAll() {
      const snapshot = await employeesCollection().get();
      return snapshot.docs.map((doc) => doc.data());
    },
    async findByRegistration(matricula) {
      const normalized = normalizeRegistration(matricula);
      const doc = await employeesCollection().doc(normalized).get();
      if (!doc.exists) return null;
      const data = doc.data();
      return data.status === "ativo" ? data : null;
    },
    async getAllowedRegistrations() {
      const snapshot = await allowedCollection().get();
      return snapshot.docs.map((doc) => doc.data());
    },
    async isRegistrationAllowed(matricula) {
      const normalized = normalizeRegistration(matricula);
      const doc = await allowedCollection().doc(normalized).get();
      return doc.exists && doc.data().status !== "inativo";
    },
    async getAllowedRegistration(matricula) {
      const normalized = normalizeRegistration(matricula);
      const doc = await allowedCollection().doc(normalized).get();
      if (!doc.exists) return null;
      const data = doc.data();
      return data.status !== "inativo" ? data : null;
    },
    async addAllowedRegistration(matricula, employee = null) {
      const normalized = normalizeRegistration(matricula);
      const ref = allowedCollection().doc(normalized);
      const existingDoc = await ref.get();
      const existing = existingDoc.exists ? existingDoc.data() : null;
      let name = employee?.nome || existing?.nome || "";
      if (!name) {
        const employeeDoc = await employeesCollection().doc(normalized).get();
        if (employeeDoc.exists) name = employeeDoc.data().nome || "";
      }
      const data = {
        matricula: normalized,
        nome: name,
        role: employee?.role || existing?.role || "",
        roleValue: employee?.roleValue || existing?.roleValue || "",
        status: "ativo",
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await ref.set(data);
      return this.getAllowedRegistrations();
    },
    async updateAllowedRegistration(matricula, changes) {
      const normalized = normalizeRegistration(matricula);
      await allowedCollection().doc(normalized).update({ ...changes, updatedAt: new Date().toISOString() });
      return this.getAllowedRegistrations();
    },
    async removeAllowedRegistration(matricula) {
      const normalized = normalizeRegistration(matricula);
      await allowedCollection().doc(normalized).delete();
      return this.getAllowedRegistrations();
    },
    async upsert(employee) {
      const normalized = normalizeRegistration(employee.matricula);
      const ref = employeesCollection().doc(normalized);
      const existingDoc = await ref.get();
      const existing = existingDoc.exists ? existingDoc.data() : null;
      const data = {
        ...employee,
        matricula: normalized,
        status: employee.status || "ativo",
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await ref.set(data);
      return this.getAll();
    },
    async remove(matricula) {
      const normalized = normalizeRegistration(matricula);
      await employeesCollection().doc(normalized).delete();
      return this.getAll();
    },
    async replaceAll(employees) {
      const batch = window.portalFirebaseDb.batch();
      employees.forEach((employee) => {
        const normalized = normalizeRegistration(employee.matricula);
        const ref = employeesCollection().doc(normalized);
        batch.set(ref, { ...employee, matricula: normalized, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      return this.getAll();
    }
  });
})();
