import { useEffect, useState } from 'react'

import { type HighScore } from '../types'

export const LOCAL_STORAGE_KEY = 'highScore'

interface Props {
  onReset: (highScore?: HighScore) => void
  newHighScore?: number
}

const GameOver = ({ onReset, newHighScore }: Props) => {
  const [playerName, setPlayerName] = useState('')

  const reset = () => {
    if (!newHighScore) {
      onReset()
      return
    }

    const trimmedName = playerName.trim()
    if (!trimmedName) return false

    const highScore: HighScore = {
      name: playerName,
      score: newHighScore
    }
    onReset(highScore)
    setPlayerName('')
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(highScore))
  }

  // call reset on enter key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') reset()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reset])

  return (
    <>
      <div className='restart-game mask'>
        {newHighScore && (
          <div className='high-score'>
            <h1>
              <div className='trophy big' style={{ margin: '0 12px 0' }} />
              New High Score!
              <div className='trophy big' style={{ margin: '0 12px 0' }} />
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
        <button onClick={reset}>RESET</button>
      </div>

      {newHighScore && <div className='applause' />}
    </>
  )
}

export default GameOver
