import { useState } from 'react'

import { GameState, type HighScore } from '../types'
import Game from './Game'
import Webcam from './Webcam'
import { LOCAL_STORAGE_KEY } from './GameOver'
import logo from '../assets/fpt-logo.png'

const Layout = () => {
  const [gameState, setGameState] = useState(GameState.IDLE)
  const [happyLevel, setHappyLevel] = useState(0)
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const savedHighScore = localStorage.getItem(LOCAL_STORAGE_KEY)
  const [highScore, setHighScore] = useState<HighScore>(() => (savedHighScore ? JSON.parse(savedHighScore) : []))

  return (
    <div>
      {modelsLoaded && (
        <Game
          isHappy={happyLevel > 0.8}
          gameState={gameState}
          setGameState={setGameState}
          highScore={highScore}
          setHighScore={setHighScore}
        />
      )}
      <Webcam onHappyLevelChange={setHappyLevel} gameState={gameState} onModelsLoaded={() => setModelsLoaded(true)} />

      {/* Leaderboard */}
      {highScore.length > 0 && (
        <div className='leaderboard'>
          <h1>Top 5</h1>
          {highScore.map((player, index) => (
            <div key={index} className='leaderboard-item'>
              <span className='rank'>#{index + 1}</span>
              <span className='name'>{player.name}</span>
              <span className='score'>{player.score}</span>
            </div>
          ))}
        </div>
      )}

      <img src={logo} alt='logo' className='logo' />
    </div>
  )
}

export default Layout
