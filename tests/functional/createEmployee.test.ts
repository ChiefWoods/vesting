import { BN, Program } from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { Vesting } from "anchor/target/types/vesting";
import { beforeEach, describe, expect, test } from "bun:test";
import { ProgramTestContext } from "solana-bankrun";
import { getBankrunSetup } from "../setup";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { mint } from "../constants";
import { getEmployeePdaAndBump, getVestPdaAndBump } from "../pda";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { getEmployeeAcc } from "../accounts";

describe("createEmployee", () => {
  let { context, provider, program } = {} as {
    context: ProgramTestContext;
    provider: BankrunProvider;
    program: Program<Vesting>;
  };

  const [owner, beneficiary] = Array.from({ length: 2 }, Keypair.generate);

  const companyName = "Company A";
  const [vestPda] = getVestPdaAndBump(companyName);

  beforeEach(async () => {
    ({ context, provider, program } = await getBankrunSetup(
      [owner, beneficiary].map((kp) => {
        return {
          address: kp.publicKey,
          info: {
            data: new Uint8Array(0),
            executable: false,
            lamports: LAMPORTS_PER_SOL,
            owner: SystemProgram.programId,
          },
        };
      })
    ));

    await program.methods
      .createVest(companyName)
      .accounts({
        owner: owner.publicKey,
        mint: mint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();
  });

  test("creates an employee account", async () => {
    const { unixTimestamp } = await context.banksClient.getClock();

    const startTime = new BN(unixTimestamp);
    const endTime = new BN(Number(unixTimestamp) + 100);
    const cliffTime = new BN(Number(unixTimestamp) + 50);
    const totalAmount = new BN(10);

    await program.methods
      .createEmployee({
        startTime,
        endTime,
        cliffTime,
        totalAmount,
      })
      .accountsPartial({
        owner: owner.publicKey,
        beneficiary: beneficiary.publicKey,
        vest: vestPda,
      })
      .signers([owner])
      .rpc();

    const [employeePda, employeeBump] = getEmployeePdaAndBump(
      beneficiary.publicKey,
      vestPda
    );
    const employeeAcc = await getEmployeeAcc(program, employeePda);

    expect(employeeAcc.bump).toEqual(employeeBump);
    expect(employeeAcc.startTime.toNumber()).toEqual(startTime.toNumber());
    expect(employeeAcc.endTime.toNumber()).toEqual(endTime.toNumber());
    expect(employeeAcc.cliffTime.toNumber()).toEqual(cliffTime.toNumber());
    expect(employeeAcc.totalAmount.toNumber()).toEqual(totalAmount.toNumber());
    expect(employeeAcc.totalWithdrawn.toNumber()).toEqual(0);
    expect(employeeAcc.beneficiary).toStrictEqual(beneficiary.publicKey);
    expect(employeeAcc.vest).toStrictEqual(vestPda);
  });
});
