import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import issuesRouter from './routes/issues'
import aiRouter from './routes/ai'
import authRouter from './routes/auth'
import adminRouter from './routes/admin'
import profileRouter from './routes/profile'
import verificationRouter from './routes/verification'
import leaderboardRouter from './routes/leaderboard'
import { errorHandler } from './middleware/error-handler'

dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || '8000', 10)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: process.env.APP_NAME || 'Community Hero API' })
})

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/profile', profileRouter)
app.use('/api/issues', issuesRouter)
app.use('/api/ai', aiRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/api', verificationRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`${process.env.APP_NAME || 'API'} running on port ${PORT}`)
})
