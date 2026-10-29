import fastify from 'fastify'
import { checkDatabase, closeDatabase } from './modules/database/database.module.ts'

const server = fastify({ logger: true })

server.addHook('onClose', async () => {
  await closeDatabase()
})

await checkDatabase()

server.get('/ping', async () => 'pong\n')

const shutdown = async (signal: string): Promise<void> => {
  server.log.info({ signal }, 'shutting down')
  await server.close()
  process.exit(0)
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

await server.listen({ port: Number(process.env.PORT ?? 9090), host: '0.0.0.0' })
