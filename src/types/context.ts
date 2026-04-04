import { Context, Scenes } from 'telegraf';

export interface SessionData extends Scenes.SceneSession {
  email?: string;
  otp?: string;
  token?: string;
  tokenTimestamp?: number;
  authenticated: boolean;
  username?: string;
  language?: string;
  awaitingInput?: 'username' | 'language' | null;
  isReturningUser?: boolean;
}

export interface MyContext extends Context {
  session: SessionData;
  scene: Scenes.SceneContextScene<MyContext>;
}