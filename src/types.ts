export enum GameState {
  IDLE,
  PLAYING,
  GAME_OVER
}

export interface HighScore {
  name: string
  score: number
}