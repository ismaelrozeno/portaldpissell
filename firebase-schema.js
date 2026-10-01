window.portalDataModel = Object.freeze({
  collections: {
    users: "users",
    matriculaIndex: "matriculaIndex",
    employees: "employees",
    allowedRegistrations: "allowedRegistrations",
    releases: "releases",
    collectiveReleases: "collectiveReleases",
    monthlyClosures: "monthlyClosures",
    importRuns: "importRuns",
    biometrics: "biometrics"
  },
  releaseStatuses: ["pending", "authorized", "denied"],
  hourTreatments: ["abonado", "nao-abonado", "com-retorno"],
  retentionMonths: 24,
  employeeKey: "registration"
});
