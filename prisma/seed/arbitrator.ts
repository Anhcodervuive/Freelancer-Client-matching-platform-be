import { prisma, runStep, faker } from './_utils'
import { Role } from '../../src/generated/prisma'

const ARBITRATORS = [
        {
                email: 'arbitrator.one@example.com',
                firstName: 'Arbitrator',
                lastName: 'One'
        },
        {
                email: 'arbitrator.two@example.com',
                firstName: 'Arbitrator',
                lastName: 'Two'
        }
]

function buildProfileName(name?: { firstName?: string | null; lastName?: string | null }) {
        if (!name) {
                return {
                        firstName: faker.person.firstName(),
                        lastName: faker.person.lastName()
                }
        }

        return {
                firstName: name.firstName ?? faker.person.firstName(),
                lastName: name.lastName ?? faker.person.lastName()
        }
}

export async function seedArbitrators() {
        await runStep('Seed arbitrators', async () => {
                for (const arbitrator of ARBITRATORS) {
                        const names = buildProfileName({ firstName: arbitrator.firstName, lastName: arbitrator.lastName })

                        await prisma.user.upsert({
                                where: { email: arbitrator.email },
                                create: {
                                        email: arbitrator.email,
                                        role: Role.ARBITRATOR,
                                        isActive: true,
                                        emailVerifiedAt: new Date(),
                                        profile: {
                                                create: {
                                                        firstName: names.firstName,
                                                        lastName: names.lastName
                                                }
                                        }
                                },
                                update: {
                                        role: Role.ARBITRATOR,
                                        isActive: true,
                                        emailVerifiedAt: new Date(),
                                        profile: {
                                                upsert: {
                                                        update: {
                                                                firstName: names.firstName,
                                                                lastName: names.lastName
                                                        },
                                                        create: {
                                                                firstName: names.firstName,
                                                                lastName: names.lastName
                                                        }
                                                }
                                        }
                                }
                        })
                }
        })
}
