import { useState } from 'react'

import { GameState } from '../types'
import Game from './Game'
import Webcam from './Webcam'

const Layout = () => {
  const [gameState, setGameState] = useState(GameState.IDLE)
  const [happyLevel, setHappyLevel] = useState(0)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  return (
    <div>
      {modelsLoaded && <Game isHappy={happyLevel > 0.9} gameState={gameState} setGameState={setGameState} />}
      <Webcam onHappyLevelChange={setHappyLevel} gameState={gameState} onModelsLoaded={() => setModelsLoaded(true)} />
    </div>
  )
}

export default Layout
