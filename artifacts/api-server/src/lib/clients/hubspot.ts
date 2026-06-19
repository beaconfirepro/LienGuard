/**
 * HubSpotClient — Phase 0 fixture stub.
 *
 * Returns canned fixture data so every downstream consumer has a working
 * interface before the real HubSpot API credentials are configured.
 *
 * Replace each method body with a real API call in Phase 2.
 */

export interface HubSpotProject {
  hubspotProjectId: string;
  projectName: string;
  status: string;
  jobSiteAddress: string;
}

export interface HubSpotCompany {
  hubspotCompanyId: string;
  legalName: string;
  mailingAddress: string;
  email?: string;
  phone?: string;
  paymentTermsDays: number;
  requiresNotarizedWaivers: boolean;
}

const FIXTURE_PROJECTS: HubSpotProject[] = [
  {
    hubspotProjectId: "hs_proj_900",
    projectName: "Travis Office Retrofit",
    status: "install",
    jobSiteAddress: "100 Main St, Austin, TX",
  },
  {
    hubspotProjectId: "hs_proj_901",
    projectName: "Oak Ave Apartments",
    status: "install",
    jobSiteAddress: "55 Oak Ave, Dallas, TX",
  },
  {
    hubspotProjectId: "hs_proj_902",
    projectName: "Cedar Custom Home",
    status: "install",
    jobSiteAddress: "7 Cedar Ct, Houston, TX",
  },
];

const FIXTURE_COMPANIES: HubSpotCompany[] = [
  {
    hubspotCompanyId: "hs_co_100",
    legalName: "Summit Builders LLC",
    mailingAddress: "100 Summit Dr, Austin TX",
    email: "ap@summit.test",
    paymentTermsDays: 30,
    requiresNotarizedWaivers: true,
  },
  {
    hubspotCompanyId: "hs_co_200",
    legalName: "Delinquent Dev Co",
    mailingAddress: "200 Dev Blvd, Dallas TX",
    email: "billing@deldev.test",
    paymentTermsDays: 30,
    requiresNotarizedWaivers: false,
  },
  {
    hubspotCompanyId: "hs_co_owner1",
    legalName: "Travis Property Holdings LP",
    mailingAddress: "PO Box 1, Austin TX",
    paymentTermsDays: 30,
    requiresNotarizedWaivers: false,
  },
  {
    hubspotCompanyId: "hs_co_gc1",
    legalName: "Apex General Contractors",
    mailingAddress: "200 Build Rd, Austin TX",
    paymentTermsDays: 30,
    requiresNotarizedWaivers: false,
  },
];

export class HubSpotClient {
  async getProject(hubspotProjectId: string): Promise<HubSpotProject | null> {
    return FIXTURE_PROJECTS.find((p) => p.hubspotProjectId === hubspotProjectId) ?? null;
  }

  async getCompany(hubspotCompanyId: string): Promise<HubSpotCompany | null> {
    return FIXTURE_COMPANIES.find((c) => c.hubspotCompanyId === hubspotCompanyId) ?? null;
  }

  async listProjects(): Promise<HubSpotProject[]> {
    return FIXTURE_PROJECTS;
  }

  async postActivity(_params: {
    hubspotCompanyId: string;
    type: string;
    body: string;
    activityDate: Date;
  }): Promise<{ hubspotActivityId: string }> {
    return { hubspotActivityId: `hs_act_stub_${Date.now()}` };
  }
}

export const hubspotClient = new HubSpotClient();
