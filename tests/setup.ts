import { Program } from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { AddedAccount, startAnchor } from "solana-bankrun";
import { Vesting } from "../target/types/vesting";
import idl from "../target/idl/vesting.json";
import {
  MINT_SIZE,
  MintLayout,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { mint } from "./constants";

export async function getBankrunSetup(accounts: AddedAccount[] = []) {
  const mintData = new Uint8Array(MINT_SIZE);

  MintLayout.encode(
    {
      decimals: 6,
      isInitialized: true,
      freezeAuthority: PublicKey.default,
      freezeAuthorityOption: 0,
      mintAuthority: PublicKey.default,
      mintAuthorityOption: 0,
      supply: 1000n,
    },
    mintData
  );

  const context = await startAnchor(
    "",
    [],
    [
      ...accounts,
      {
        address: mint.publicKey,
        info: {
          data: mintData,
          executable: false,
          lamports: LAMPORTS_PER_SOL,
          owner: TOKEN_2022_PROGRAM_ID,
        },
      },
    ]
  );

  const provider = new BankrunProvider(context);
  const program = new Program(idl as Vesting, provider);

  return {
    context,
    provider,
    program,
  };
}
