import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'

import { GameState } from '../types'

// Import audio files as modules
import jumpSound from '../assets/yay.mp3'
import eatSound from '../assets/eat.mp3'
import gameOverSound from '../assets/game-over.mp3'
import gameStartSound from '../assets/game-start.mp3'
import winSound from '../assets/high-score.mp3'

const JUMP_DURATION = 800

const tailWidth = 40
const hornWidth = 20

interface HighScore {
  name: string
  score: number
}

interface Props {
  happyLevel: number
  gameState: GameState
  setGameState: (gameState: GameState) => void
}

const jumpAudio = new Audio(jumpSound)
const eatAudio = new Audio(eatSound)
const gameOverAudio = new Audio(gameOverSound)
const gameStartAudio = new Audio(gameStartSound)
const winAudio = new Audio(winSound)
const LOCAL_STORAGE_KEY = 'highScore'

const Game: React.FC<Props> = ({ happyLevel, gameState, setGameState }) => {
  const savedHighScore = localStorage.getItem(LOCAL_STORAGE_KEY)
  const [highScore, setHighScore] = useState<HighScore | null>(() =>
    savedHighScore ? JSON.parse(savedHighScore) : null
  )
  const [score, setScore] = useState(0)
  const isNewHighScore = score > (highScore?.score || 0)

  const [playerName, setPlayerName] = useState('')

  const isGameOver = gameState === GameState.GAME_OVER
  const isIdle = gameState === GameState.IDLE

  const playerRef = useRef<HTMLDivElement>(null)
  const obstacleRef = useRef<HTMLDivElement>(null)
  const collisionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const berryRef = useRef<HTMLDivElement>(null)
  const berryCollectedRef = useRef<boolean>(false)

  const jump = () => {
    const player = playerRef.current
    if (player && !player.classList.contains('jump')) {
      jumpAudio.play()
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
      eatAudio.play()
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

      if (isGameOver && isNewHighScore) {
        setTimeout(() => {
          winAudio.play()
        }, 1000)
      }
      return
    }

    collisionIntervalRef.current = setInterval(() => {
      if (isCollided()) {
        gameOverAudio.play()
        setGameState(GameState.GAME_OVER)
        if (isNewHighScore) winAudio.play()
      }
      checkBerryCollision()
    }, 100)

    return () => {
      if (collisionIntervalRef.current) {
        clearInterval(collisionIntervalRef.current)
      }
    }
  }, [gameState])

  const saveHighScore = (name: string) => {
    const newHighScore: HighScore = {
      name,
      score
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHighScore))
    setHighScore(newHighScore)
    setPlayerName('')

    return true
  }

  const restart = () => {
    if (isNewHighScore) {
      const trimmedName = playerName.trim()
      if (!trimmedName) return false
      saveHighScore(trimmedName)
    }

    gameStartAudio.play()
    setGameState(GameState.PLAYING)
    setScore(0)
    setPlayerName('')
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
      {highScore && (
        <div className='score-card'>
          <div className='trophy' />
          <div style={{ paddingTop: 10 }}>
            {highScore.score} ( {highScore.name} )
          </div>
        </div>
      )}
      <div className='score-card'>
        <div className='berry-small' />
        <div style={{ paddingTop: 10 }}>{score}</div>
      </div>

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
          {isNewHighScore && (
            <div className='high-score'>
              <h1>
                <div className='trophy big' style={{ margin: '0 12px 0' }} />
                New High Score!
              </h1>
              <input
                type='text'
                placeholder='Enter your name'
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={50}
                autoFocus
              />
            </div>
          )}
          <button onClick={restart}>RESTART</button>
        </div>
      )}

      {isIdle && (
        <div className='mask'>
          <button
            onClick={() => {
              gameStartAudio.play()
              setGameState(GameState.PLAYING)
            }}
          >
            START
          </button>
        </div>
      )}
    </div>
  )
}

export default Game
