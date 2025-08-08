import { useEffect, useRef, useState } from 'react'

import { GameState } from '../types'
import classNames from 'classnames'

const JUMP_DURATION = 800

const tailWidth = 40
const hornWidth = 20

interface Props {
  happyLevel: number
  gameState: GameState
  setGameState: (gameState: GameState) => void
}

const Game: React.FC<Props> = ({ happyLevel, gameState, setGameState }) => {
  const [score, setScore] = useState(0)
  const berryCollectedRef = useRef<boolean>(false)

  const isGameOver = gameState === GameState.GAME_OVER
  const isIdle = gameState === GameState.IDLE

  const playerRef = useRef<HTMLDivElement>(null)
  const obstacleRef = useRef<HTMLDivElement>(null)
  const berryRef = useRef<HTMLDivElement>(null)
  const collisionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const jump = () => {
    const player = playerRef.current
    if (player && !player.classList.contains('jump')) {
      player.classList.add('jump')
    }

    setTimeout(() => {
      player?.classList.remove('jump')
    }, JUMP_DURATION)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ') jump()
  }

  // useEffect(() => {
  //   console.log(happyLevel)
  //   if (happyLevel > 0.9) jump()
  // }, [happyLevel])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const isCollided = () => {
    const playerClientRect = playerRef.current?.getBoundingClientRect()
    const obstacleClientRect = obstacleRef.current?.getBoundingClientRect()
    if (!playerClientRect || !obstacleClientRect) return false

    const { left: playerL, right: playerR, bottom: playerB } = playerClientRect
    const { left: obstacleL, right: obstacleR, top: obstacleT } = obstacleClientRect

    const xCollision = obstacleR - tailWidth > playerL && obstacleL < playerR - hornWidth
    const yCollision = playerB > obstacleT

    return xCollision && yCollision
  }

  const checkBerryCollision = () => {
    if (berryCollectedRef.current) return

    const playerClientRect = playerRef.current?.getBoundingClientRect()
    const berryClientRect = berryRef.current?.getBoundingClientRect()
    if (!playerClientRect || !berryClientRect) return

    const { left: playerL, right: playerR, top: playerT, bottom: playerB } = playerClientRect
    const { left: berryL, right: berryR, top: berryT, bottom: berryB } = berryClientRect

    // Check collision
    const xCollision = berryR > playerL && berryL < playerR
    const yCollision = berryB > playerT && berryT < playerB

    if (xCollision && yCollision) {
      setScore((prev) => prev + 10)
      berryCollectedRef.current = true
      berryRef.current?.classList.add('collected')

      setTimeout(() => {
        berryCollectedRef.current = false
        berryRef.current?.classList.remove('collected')
        berryRef.current!.style.animation = 'none'
        void berryRef.current!.offsetWidth
        berryRef.current!.style.animation = 'move 3s linear infinite'
        berryRef.current!.style.animationDelay = `${Math.random() * 1000}ms`
      }, 3000)
    }
  }

  useEffect(() => {
    if (isGameOver || isIdle) {
      clearInterval(collisionIntervalRef.current!)
      return
    }

    collisionIntervalRef.current = setInterval(() => {
      // if (isCollided()) {
      //   setGameState(GameState.GAME_OVER)
      // }
      checkBerryCollision()
    }, 100)

    return () => {
      if (collisionIntervalRef.current) {
        clearInterval(collisionIntervalRef.current)
      }
    }
  }, [gameState])

  const restart = () => {
    setGameState(GameState.PLAYING)
    setScore(0)
    berryCollectedRef.current = false

    // Reset obstacle animation
    obstacleRef.current!.style.animation = 'none'
    void obstacleRef.current!.offsetWidth
    obstacleRef.current!.style.animation = 'obstacle-move 6s linear infinite'
  }

  return (
    <div
      className='game-container'
      style={{
        animationPlayState: isGameOver ? 'paused' : 'running'
      }}
    >
      <div className='score-card'>Score: {score}</div>
      <div
        ref={playerRef}
        className={classNames('player', isGameOver && 'stop')}
        style={{
          animationDuration: `${JUMP_DURATION}ms`
        }}
      />

      <div
        ref={obstacleRef}
        className='obstacle'
        style={{
          animationPlayState: gameState === GameState.PLAYING ? 'running' : 'paused'
        }}
      />

      <div
        ref={berryRef}
        className='berry'
        style={{
          animationPlayState: gameState === GameState.PLAYING ? 'running' : 'paused'
        }}
      />

      {isGameOver && (
        <div className='restart-game mask'>
          <button onClick={restart}>RESTART</button>
        </div>
      )}

      {isIdle && (
        <div className='mask'>
          <button onClick={() => setGameState(GameState.PLAYING)}>START</button>
        </div>
      )}
    </div>
  )
}

export default Game
