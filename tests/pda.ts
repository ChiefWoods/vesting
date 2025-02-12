import { PublicKey } from "@solana/web3.js";
import idl from "../target/idl/vesting.json";

export function getVestPdaAndBump(companyName: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vest"), Buffer.from(companyName)],
    new PublicKey(idl.address)
  );
}

export function getEmployeePdaAndBump(
  beneficiary: PublicKey,
  vestPda: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("employee"), beneficiary.toBuffer(), vestPda.toBuffer()],
    new PublicKey(idl.address)
  );
}
