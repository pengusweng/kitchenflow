"use client";

import { useEffect, useState } from "react";
import { getUnits } from "../services/units.service";
import { SEEDED_UNITS, toUnit, type Unit } from "../utils/units";

/**
 * The units the API knows (GET /units), for the ingredient unit pickers. Starts
 * on the seeded units so the form is usable straight away, and keeps them if the
 * list can't be loaded; `add` puts a unit created on this page into the list.
 */
export function useUnits() {
  const [units, setUnits] = useState<Unit[]>(SEEDED_UNITS);

  useEffect(() => {
    const controller = new AbortController();
    getUnits(controller.signal)
      .then((loaded) => setUnits(loaded.map(toUnit)))
      .catch(() => {
        // Keep the seeded list: the recipe form still works with it, and adding a unit reports its own errors.
      });
    return () => controller.abort();
  }, []);

  const add = (unit: Unit) =>
    setUnits((current) => [...current.filter((u) => u.code !== unit.code), unit]);

  return { units, add };
}
