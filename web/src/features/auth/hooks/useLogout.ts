import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffectEvent, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "../services/auth.service";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: logout,
    retry: false,
    onSuccess: () => {
      // The cache is shared by everyone who signs in on this browser: drop the
      // signed-out account's orders, tickets and staff before the next one arrives.
      queryClient.removeQueries();
      router.replace("/login");
    },
  });

  // The hidden dashboard is restored on the next sign-in; don't bring back "Signing out…".
  const resetOnHide = useEffectEvent(() => mutation.reset());
  useLayoutEffect(() => () => resetOnHide(), []);

  return mutation;
}
