import { StatementAnalysis } from "./StatementAnalysis.js";

export interface SCPAnalysis {
  orgIdentifier: string;
  statementAnalysis: StatementAnalysis[];
}