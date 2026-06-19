/**
 * ConnecteamClient — Phase 0 fixture stub.
 *
 * Returns canned timesheet entries so the deadline engine has input data
 * during development. Replace with real Connecteam API in Phase 3.
 */

export interface ConnecteamTimeEntry {
  connecteamTimeRecordId: string;
  connecteamUserId: string;
  stageTag: string;
  workStream: "construction" | "design";
  hours: number;
  workDate: Date;
  hubspotProjectId: string;
}

const FIXTURE_TIMESHEETS: ConnecteamTimeEntry[] = [
  {
    connecteamTimeRecordId: "ct_tr_1",
    connecteamUserId: "ct_u1",
    stageTag: "install",
    workStream: "construction",
    hours: 38.5,
    workDate: new Date("2026-03-12"),
    hubspotProjectId: "hs_proj_900",
  },
  {
    connecteamTimeRecordId: "ct_tr_2",
    connecteamUserId: "ct_u2",
    stageTag: "design",
    workStream: "design",
    hours: 10.0,
    workDate: new Date("2026-01-22"),
    hubspotProjectId: "hs_proj_900",
  },
];

export class ConnecteamClient {
  async getTimesheetsByProject(hubspotProjectId: string): Promise<ConnecteamTimeEntry[]> {
    return FIXTURE_TIMESHEETS.filter((t) => t.hubspotProjectId === hubspotProjectId);
  }

  async getAllTimesheets(): Promise<ConnecteamTimeEntry[]> {
    return FIXTURE_TIMESHEETS;
  }
}

export const connecteamClient = new ConnecteamClient();
