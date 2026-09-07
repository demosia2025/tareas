// hash-password.ts
import { hash } from "bcryptjs";

async function main() {
  const password = "MiContraseña123"; // ← Cambia por tu contraseña
  const hashed = await hash(password, 12);
  console.log("✅ Hash generado:");
  console.log(hashed);
}

main();