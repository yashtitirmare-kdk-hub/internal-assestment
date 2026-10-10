export type SchemeType = "THEORY" | "PRACTICAL" | "MIXED";
export type ComponentType = "THEORY" | "PRACTICAL";
export type SchemeStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
/** How the total weightage of active components is checked. Chosen per scheme. */
export type WeightageRule = "TOTAL_100" | "NO_TOTAL";

export interface SchemeComponent {
  id: string;
  name: string;
  code: string;
  type: ComponentType;
  maxMarks: number;
  passMarks?: number | undefined;
  weightage: number;
  sequence: number;
  active: boolean;
}

/** One version of a scheme. All versions of a scheme share the same immutable `code`. */
export interface SchemeVersion {
  id: string;
  code: string; // SCH001
  version: number;
  name: string;
  type: SchemeType;
  departmentId: string;
  programId: string;
  semesterId?: string | undefined;
  weightageRule: WeightageRule;
  status: SchemeStatus;
  components: SchemeComponent[];
  note?: string | undefined;
}
