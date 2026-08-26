// Minimal ambient types for the parts of Google Identity Services' JS API
// (https://developers.google.com/identity/gsi/web/reference/js-reference)
// this app actually calls — hand-written rather than pulling in an
// unofficial @types package for a handful of methods.

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: "popup" | "redirect";
}

interface GoogleButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number | string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: GoogleIdConfiguration): void;
        renderButton(parent: HTMLElement, options?: GoogleButtonConfiguration): void;
        disableAutoSelect(): void;
      };
    };
  };
}
