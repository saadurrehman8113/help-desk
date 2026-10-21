import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const { signIn, signOut, useSession } = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: ["admin", "agent"],
          required: true,
          defaultValue: "agent",
          input: false,
        },
      },
    }),
  ],
});
