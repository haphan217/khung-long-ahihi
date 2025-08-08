import { useState } from 'react'

import { GameState } from '../types'
import Game from './Game'
import Webcam from './Webcam'

const Layout = () => {
  const [gameState, setGameState] = useState(GameState.IDLE)
  const [happyLevel, setHappyLevel] = useState(0)

  return (
    <div>
      <Game happyLevel={happyLevel} gameState={gameState} setGameState={setGameState} />
      {/* <Webcam onHappyLevelChange={setHappyLevel} gameState={gameState} /> */}
    </div>
  )
}

export default Layout
