import { AnchorError, BN, Program } from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { Vesting } from "anchor/target/types/vesting";
import { beforeEach, describe, expect, test } from "bun:test";
import { Clock, ProgramTestContext } from "solana-bankrun";
import { getBankrunSetup } from "../setup";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { getEmployeePdaAndBump, getVestPdaAndBump } from "../pda";
import { mint } from "../constants";
import {
  ACCOUNT_SIZE,
  AccountLayout,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { getEmployeeAcc } from "../accounts";

describe("claimTokens", () => {
  let { context, provider, program } = {} as {
    context: ProgramTestContext;
    provider: BankrunProvider;
    program: Program<Vesting>;
  };

  const [owner, beneficiary] = Array.from({ length: 2 }, Keypair.generate);
  const tokenProgram = TOKEN_2022_PROGRAM_ID;

  const companyName = "Company A";
  const [vestPda] = getVestPdaAndBump(companyName);
  const [employeePda] = getEmployeePdaAndBump(beneficiary.publicKey, vestPda);
  const treasuryAta = getAssociatedTokenAddressSync(
    mint.publicKey,
    vestPda,
    true,
    tokenProgram
  );

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
        tokenProgram,
      })
      .signers([owner])
      .rpc();
  });

  test("claim tokens after end time", async () => {
    let {
      epoch,
      epochStartTimestamp,
      leaderScheduleEpoch,
      slot,
      unixTimestamp,
    } = await context.banksClient.getClock();

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

    const treasuryAtaData = new Uint8Array(ACCOUNT_SIZE);

    AccountLayout.encode(
      {
        amount: BigInt(totalAmount.toNumber()),
        closeAuthority: PublicKey.default,
        closeAuthorityOption: 0,
        delegate: PublicKey.default,
        delegatedAmount: 0n,
        delegateOption: 0,
        isNative: 0n,
        isNativeOption: 0,
        mint: mint.publicKey,
        owner: vestPda,
        state: 1,
      },
      treasuryAtaData
    );

    context.setAccount(treasuryAta, {
      executable: false,
      owner: tokenProgram,
      data: treasuryAtaData,
      lamports: LAMPORTS_PER_SOL,
    });

    context.setClock(
      new Clock(
        slot,
        epochStartTimestamp,
        epoch,
        leaderScheduleEpoch,
        unixTimestamp + BigInt(endTime.toNumber() + 1)
      )
    );

    await program.methods
      .claimTokens()
      .accountsPartial({
        beneficiary: beneficiary.publicKey,
        vest: vestPda,
        employee: employeePda,
        tokenProgram,
      })
      .signers([beneficiary])
      .rpc();

    const beneficiaryAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      beneficiary.publicKey,
      false,
      tokenProgram
    );
    const beneficiaryAtaAcc = await getAccount(
      provider.connection,
      beneficiaryAta,
      "confirmed",
      tokenProgram
    );

    expect(Number(beneficiaryAtaAcc.amount)).toEqual(totalAmount.toNumber());

    const employeeAcc = await getEmployeeAcc(program, employeePda);

    expect(employeeAcc.totalWithdrawn.toNumber()).toEqual(
      totalAmount.toNumber()
    );
  });

  test("claim tokens before end time", async () => {
    let {
      epoch,
      epochStartTimestamp,
      leaderScheduleEpoch,
      slot,
      unixTimestamp,
    } = await context.banksClient.getClock();

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

    const treasuryAtaData = new Uint8Array(ACCOUNT_SIZE);

    AccountLayout.encode(
      {
        amount: BigInt(totalAmount.toNumber()),
        closeAuthority: PublicKey.default,
        closeAuthorityOption: 0,
        delegate: PublicKey.default,
        delegatedAmount: 0n,
        delegateOption: 0,
        isNative: 0n,
        isNativeOption: 0,
        mint: mint.publicKey,
        owner: vestPda,
        state: 1,
      },
      treasuryAtaData
    );

    context.setAccount(treasuryAta, {
      executable: false,
      owner: tokenProgram,
      data: treasuryAtaData,
      lamports: LAMPORTS_PER_SOL,
    });

    const timeToJump =
      (endTime.toNumber() -
        Number(unixTimestamp) +
        (cliffTime.toNumber() - Number(unixTimestamp))) /
      2;
    context.setClock(
      new Clock(
        slot,
        epochStartTimestamp,
        epoch,
        leaderScheduleEpoch,
        unixTimestamp + BigInt(timeToJump)
      )
    );

    await program.methods
      .claimTokens()
      .accountsPartial({
        beneficiary: beneficiary.publicKey,
        vest: vestPda,
        employee: employeePda,
        tokenProgram,
      })
      .signers([beneficiary])
      .rpc();

    const beneficiaryAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      beneficiary.publicKey,
      false,
      tokenProgram
    );
    const beneficiaryAtaAcc = await getAccount(
      provider.connection,
      beneficiaryAta,
      "confirmed",
      tokenProgram
    );

    expect(Number(beneficiaryAtaAcc.amount)).toBeLessThan(
      totalAmount.toNumber()
    );
    expect(Number(beneficiaryAtaAcc.amount)).not.toEqual(0);

    const employeeAcc = await getEmployeeAcc(program, employeePda);

    expect(employeeAcc.totalWithdrawn.toNumber()).toEqual(
      Number(beneficiaryAtaAcc.amount)
    );
  });

  test("throws if claiming before cliff time", async () => {
    let {
      epoch,
      epochStartTimestamp,
      leaderScheduleEpoch,
      slot,
      unixTimestamp,
    } = await context.banksClient.getClock();

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

    const treasuryAtaData = new Uint8Array(ACCOUNT_SIZE);

    AccountLayout.encode(
      {
        amount: BigInt(totalAmount.toNumber()),
        closeAuthority: PublicKey.default,
        closeAuthorityOption: 0,
        delegate: PublicKey.default,
        delegatedAmount: 0n,
        delegateOption: 0,
        isNative: 0n,
        isNativeOption: 0,
        mint: mint.publicKey,
        owner: vestPda,
        state: 1,
      },
      treasuryAtaData
    );

    context.setAccount(treasuryAta, {
      executable: false,
      owner: tokenProgram,
      data: treasuryAtaData,
      lamports: LAMPORTS_PER_SOL,
    });

    const timeToJump = cliffTime.toNumber() - 1;
    context.setClock(
      new Clock(
        slot,
        epochStartTimestamp,
        epoch,
        leaderScheduleEpoch,
        unixTimestamp + BigInt(timeToJump)
      )
    );

    try {
      await program.methods
        .claimTokens()
        .accountsPartial({
          beneficiary: beneficiary.publicKey,
          vest: vestPda,
          employee: employeePda,
          tokenProgram,
        })
        .signers([beneficiary])
        .rpc();
    } catch (err) {
      expect(err).toBeInstanceOf(AnchorError);

      const { error } = err as AnchorError;
      expect(error.errorCode.code).toEqual("ClaimNotAvailableYet");
      expect(error.errorCode.number).toEqual(6000);
    }
  });

  test("throws if claimable amount is 0", async () => {
    let {
      epoch,
      epochStartTimestamp,
      leaderScheduleEpoch,
      slot,
      unixTimestamp,
    } = await context.banksClient.getClock();

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

    const treasuryAtaData = new Uint8Array(ACCOUNT_SIZE);

    AccountLayout.encode(
      {
        amount: BigInt(totalAmount.toNumber()),
        closeAuthority: PublicKey.default,
        closeAuthorityOption: 0,
        delegate: PublicKey.default,
        delegatedAmount: 0n,
        delegateOption: 0,
        isNative: 0n,
        isNativeOption: 0,
        mint: mint.publicKey,
        owner: vestPda,
        state: 1,
      },
      treasuryAtaData
    );

    context.setAccount(treasuryAta, {
      executable: false,
      owner: tokenProgram,
      data: treasuryAtaData,
      lamports: LAMPORTS_PER_SOL,
    });

    context.setClock(
      new Clock(
        slot,
        epochStartTimestamp,
        epoch,
        leaderScheduleEpoch,
        unixTimestamp + BigInt(endTime.toNumber() + 1)
      )
    );

    await program.methods
      .claimTokens()
      .accountsPartial({
        beneficiary: beneficiary.publicKey,
        vest: vestPda,
        employee: employeePda,
        tokenProgram,
      })
      .signers([beneficiary])
      .rpc();

    try {
      await program.methods
        .claimTokens()
        .accountsPartial({
          beneficiary: beneficiary.publicKey,
          vest: vestPda,
          employee: employeePda,
          tokenProgram,
        })
        .signers([beneficiary])
        .rpc();
    } catch (err) {
      expect(err).toBeInstanceOf(AnchorError);

      const { error } = err as AnchorError;
      expect(error.errorCode.code).toEqual("NothingToClaim");
      expect(error.errorCode.number).toEqual(6001);
    }
  });
});
