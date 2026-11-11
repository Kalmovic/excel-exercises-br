import { capturarOrigem } from "@/lib/origem";
import { reportarErro } from "@/lib/reportar-erro";

// Erros de JavaScript e promessas rejeitadas sem tratamento, em qualquer página.
window.addEventListener("error", (e) => reportarErro(e.error ?? e.message, "window.error"));
window.addEventListener("unhandledrejection", (e) => reportarErro(e.reason, "unhandledrejection"));

// UTM, afiliado (?ref=) e cupom (?cupom=) desde a primeira visita.
capturarOrigem(window.location.href);
