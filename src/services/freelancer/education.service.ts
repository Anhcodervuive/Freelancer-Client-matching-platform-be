import { prismaClient } from '~/config/prisma-client'
import { AddOneEducationInput } from '~/schema/freelancer.schema'

const getAllByFreelancerId = async (userId: string) => {
	return prismaClient.education.findMany({
		where: {
			freelancerId: userId
		}
	})
}

const addOne = async (data: AddOneEducationInput, userId: string) => {
	return prismaClient.education.create({
		data: {
			schoolName: data.schoolName,
			fieldOfStudy: data.fieldOfStudy ?? null,
			degreeTitle: data.degreeTitle,
			startYear: data.startYear,
			endYear: data.endYear,
			freelancerId: userId
		}
	})
}

const updateOne = async (data: any, educationId: string) => {
	return prismaClient.education.update({
		where: {
			id: educationId
		},
		data: {
			...data
		}
	})
}

const deleteOne = async (educationId: string) => {
	return prismaClient.education.delete({
		where: {
			id: educationId
		}
	})
}

export default {
	getAllByFreelancerId,
	addOne,
	updateOne,
	deleteOne
}
