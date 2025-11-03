const { spawn } = require('node:child_process')

const processes = [
        { name: 'server', command: 'npx nodemon' },
        { name: 'email-worker', command: 'npm run worker:email' },
        { name: 'match-worker', command: 'npm run worker:match-interaction' },
        { name: 'job-moderation-worker', command: 'npm run worker:job-moderation' }
]

const managed = []
let activeCount = processes.length
let shuttingDown = false
let exitCode = 0

const terminateOthers = current => {
        for (const item of managed) {
                if (item.child === current) {
                        continue
                }

                if (item.child && !item.child.killed) {
                        item.child.kill('SIGTERM')
                }
        }
}

const handleSignal = signal => {
        if (shuttingDown) {
                return
        }

        shuttingDown = true
        if (exitCode === 0) {
                exitCode = 0
        }
        console.log(`\n[dev] Received ${signal}, shutting down...`)
        terminateOthers()
}

process.on('SIGINT', () => handleSignal('SIGINT'))
process.on('SIGTERM', () => handleSignal('SIGTERM'))

for (const entry of processes) {
        console.log(`[dev] Starting ${entry.name} (${entry.command})`)
        const child = spawn(entry.command, { shell: true, stdio: 'inherit', env: process.env })
        managed.push({ ...entry, child })

        child.on('error', error => {
                console.error(`[dev] Failed to start ${entry.name}:`, error)
                if (!shuttingDown) {
                        shuttingDown = true
                        exitCode = 1
                        terminateOthers(child)
                }
        })

        child.on('exit', (code, signal) => {
                activeCount -= 1
                const normalizedCode = typeof code === 'number' ? code : signal ? 1 : 0

                if (!shuttingDown) {
                        shuttingDown = true
                        exitCode = normalizedCode
                        const reason = signal ? `signal ${signal}` : `code ${normalizedCode}`
                        console.log(`[dev] ${entry.name} exited with ${reason}. Stopping remaining processes...`)
                        terminateOthers(child)
                } else if (normalizedCode !== 0 && exitCode === 0) {
                        exitCode = normalizedCode
                }

                if (activeCount === 0) {
                        process.exit(exitCode)
                }
        })
}
