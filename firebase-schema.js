window.portalDataModel = Object.freeze({
  collections: {
    users: "users",
    employees: "employees",
    releases: "releases",
    monthlyClosures: "monthlyClosures",
    importRuns: "importRuns"
  },
  releaseStatuses: ["pending", "authorized", "denied"],
  hourTreatments: ["abonado", "nao-abonado", "com-retorno"],
  retentionMonths: 24,
  employeeKey: "registration"
});
