import { type SimulationMode } from '../core_engine/CoreSimulatorEngine.js'

export interface SimulationOptions {
  simulationMode?: SimulationMode
  strictConditionKeys?: string[]
}
