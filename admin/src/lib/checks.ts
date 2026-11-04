// The checks staff record with a vetting decision. These mirror the
// backend's fixed lists (backend/src/shared/constants.ts: CHECK_TYPES and
// CHECK_METHODS). Staff pick from them rather than typing free text, so a
// "BRS lookup" is saved as what it is, an organisation check done through
// BRS, not guessed from the words (FINAL_VERIFICATION 12).

export const CHECK_TYPE_LABEL = {
  identity: "Identity",
  phone: "Phone number",
  organisation: "Organisation or business",
  track_record: "Track record",
  professional_register: "Professional register",
  reference: "Reference",
} as const;

export type CheckType = keyof typeof CHECK_TYPE_LABEL;

export const CHECK_METHOD_LABEL = {
  manual: "By hand",
  brs: "BRS lookup",
  lsk: "LSK register",
  icpak: "ICPAK register",
  cma: "CMA register",
  domain: "Website or domain",
  reference: "Spoke to a reference",
  provider: "Outside provider",
  // Set by the backend when a phone is confirmed by code; staff never pick it.
  otp: "Code sent to the phone",
} as const;

export type CheckMethod = keyof typeof CHECK_METHOD_LABEL;

// What staff can choose. "otp" is only ever recorded by the backend.
export const STAFF_CHECK_METHODS = (Object.keys(CHECK_METHOD_LABEL) as CheckMethod[]).filter((m) => m !== "otp");

// The usual way each kind of check is done, chosen when the kind changes.
export const DEFAULT_METHOD: Record<CheckType, CheckMethod> = {
  identity: "manual",
  phone: "manual",
  organisation: "brs",
  track_record: "manual",
  professional_register: "lsk",
  reference: "reference",
};

export interface NewCheck {
  checkType: CheckType;
  result: "passed" | "failed";
  method: CheckMethod;
}

export const isCheckType = (v: string): v is CheckType => v in CHECK_TYPE_LABEL;
export const isCheckMethod = (v: string): v is CheckMethod => v in CHECK_METHOD_LABEL;
