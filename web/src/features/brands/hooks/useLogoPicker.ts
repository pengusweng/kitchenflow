import { useEffect, useRef, useState } from "react";
import { logoProblem, type SelectedLogo } from "../utils/logo";

// A newly picked logo file with its local preview. Every preview URL is
// released as soon as it is replaced, cleared, or the form goes away.
// `noun` names the image in size errors, e.g. "Photos" for menu items.
export function useLogoPicker(noun?: string) {
  const [logo, setLogo] = useState<SelectedLogo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<SelectedLogo | null>(null);

  const replace = (next: SelectedLogo | null) => {
    if (current.current) URL.revokeObjectURL(current.current.previewUrl);
    current.current = next;
    setLogo(next);
  };

  useEffect(() => () => {
    if (current.current) URL.revokeObjectURL(current.current.previewUrl);
  }, []);

  return {
    logo,
    error,
    select(file: File) {
      const problem = logoProblem(file, noun);
      setError(problem);
      if (!problem) replace({ file, previewUrl: URL.createObjectURL(file) });
    },
    clear() {
      replace(null);
      setError(null);
    },
  };
}
