export enum GameState {
  IDLE,
  PLAYING,
  GAME_OVER
}

export interface PlayerScore {
  name: string
  score: number
}

export type HighScore = PlayerScore[]
