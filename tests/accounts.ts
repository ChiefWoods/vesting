import { PublicKey } from "@solana/web3.js";
import { Vesting } from "../target/types/vesting";
import { Program } from "@coral-xyz/anchor";

export async function getVestAcc(
  program: Program<Vesting>,
  vestPda: PublicKey
) {
  return await program.account.vest.fetchNullable(vestPda);
}

export async function getEmployeeAcc(
  program: Program<Vesting>,
  employeePda: PublicKey
) {
  return await program.account.employee.fetchNullable(employeePda);
}
