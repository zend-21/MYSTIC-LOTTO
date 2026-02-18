import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";
import { UserProfile, FortuneResult, FixedFortuneResult } from "../types";

const functions = getFunctions(app, "asia-northeast3");

export const getFortuneAndNumbers = async (profile: UserProfile): Promise<FortuneResult> => {
  const fn = httpsCallable<UserProfile, FortuneResult>(functions, "getFortuneAndNumbers");
  const result = await fn(profile);
  return result.data;
};

export const getFixedDestinyNumbers = async (profile: UserProfile): Promise<FixedFortuneResult> => {
  const fn = httpsCallable<UserProfile, FixedFortuneResult>(functions, "getFixedDestinyNumbers");
  const result = await fn(profile);
  return result.data;
};
