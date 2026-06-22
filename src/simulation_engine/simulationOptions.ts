import { type SimulationMode } from '../core_engine/CoreSimulatorEngine.js'
import { type DiscoveryContextKeyConstraint } from '../context_keys/discoveryContextKeyConstraints.js'

/**
 * Options that control how a simulation is evaluated.
 */
export interface SimulationOptions {
  /**
   * The simulation mode to run. Strict mode evaluates the request exactly as
   * supplied; Discovery mode can report conditional access for unknown or
   * intentionally non-authoritative context keys.
   */
  simulationMode?: SimulationMode

  /**
   * Discovery-only knowledge constraints for context keys.
   *
   * These constraints tell Discovery mode whether a key's presence and concrete
   * value are authoritative. They are ignored in Strict mode.
   */
  discoveryContextKeyConstraints?: DiscoveryContextKeyConstraint[]
}
