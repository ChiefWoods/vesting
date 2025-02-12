import { Program } from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { Vesting } from "anchor/target/types/vesting";
import { beforeEach, describe, expect, test } from "bun:test";
import { ProgramTestContext } from "solana-bankrun";
import { getBankrunSetup } from "../setup";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { mint } from "../constants";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { getVestPdaAndBump } from "../pda";
import { getVestAcc } from "../accounts";

describe("createVest", () => {
  let { context, provider, program } = {} as {
    context: ProgramTestContext;
    provider: BankrunProvider;
    program: Program<Vesting>;
  };

  const owner = Keypair.generate();

  beforeEach(async () => {
    ({ context, provider, program } = await getBankrunSetup([
      {
        address: owner.publicKey,
        info: {
          data: new Uint8Array(0),
          executable: false,
          lamports: LAMPORTS_PER_SOL,
          owner: SystemProgram.programId,
        },
      },
    ]));
  });

  test("creates a vesting account", async () => {
    const companyName = "Company A";
    const tokenProgram = TOKEN_2022_PROGRAM_ID;

    await program.methods
      .createVest(companyName)
      .accounts({
        owner: owner.publicKey,
        mint: mint.publicKey,
        tokenProgram,
      })
      .signers([owner])
      .rpc();

    const [vestPda, vestBump] = getVestPdaAndBump(companyName);
    const vestAcc = await getVestAcc(program, vestPda);

    const treasuryAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      vestPda,
      true,
      tokenProgram
    );

    expect(vestAcc.bump).toEqual(vestBump);
    expect(vestAcc.owner).toStrictEqual(owner.publicKey);
    expect(vestAcc.mint).toStrictEqual(mint.publicKey);
    expect(vestAcc.treasury).toStrictEqual(treasuryAta);
    expect(vestAcc.companyName).toEqual(companyName);
  });
});
