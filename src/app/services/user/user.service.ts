/**
 * @module app.services.user
 */

import {
  RegisterAthleteRequest,
  UpdateAthleteRequest,
} from '@app/controllers/athlete/athlete-controller.types'
import { TokenResponse } from '@app/controllers/login/login-controller.types'
import {
  RegisterPersonalTrainer,
  UpdatePTRequest,
} from '@app/controllers/personal-trainer/personal-trainer.types'
import { DocumentExists } from '@app/exceptions/document-exists-error'
import { DocumentNotFound } from '@app/exceptions/document-not-found-error'
import { UnauthorizedError } from '@app/exceptions/unauthorized-error'
import { SubscriptionMapper } from '@app/mappers/subscription.mapper'
import { UserMapper } from '@app/mappers/user.mapper'
import { SubscriptionPackage } from '@app/model/subscription/Package'
import { PTPackage } from '@app/model/subscription/PTPackage'
import { AthleteUser } from '@app/model/user/Athlete'
import { BaseUser, BaseUserModel } from '@app/model/user/BaseUser'
import { PersonalTrainerUser } from '@app/model/user/PersonalTrainer'
import {
  AthleteResponse,
  PTPackageResponse,
  PTResponse,
  UserResponse,
} from '@app/types/response.types'
import { ObjectIdUtility } from '@app/utilities/objectid-utility'
import { TokenUtility } from '@app/utilities/token-utility'
import { Model } from 'mongoose'
import gymService from '../gym/gym.service'
import imageService from '../image/image.service'
import jwtService from '../jwt/jwt.service'
import loggerService from '../logger/logger-service'

/**
 * User service
 * @class
 * @alias app.services.user.UserService
 */
class UserService {
  private baseUserModel: BaseUserModel
  private athleteModel: Model<any>
  private ptModel: Model<any>
  private ptPackage: Model<any>

  constructor() {
    this.baseUserModel = BaseUser
    this.athleteModel = AthleteUser
    this.ptModel = PersonalTrainerUser
    this.ptPackage = PTPackage
  }

  /**
   * Registers athlete user type to the database
   */
  public async registerAthlete(
    registerUser: RegisterAthleteRequest,
  ): Promise<TokenResponse> {
    const {
      fullName,
      email,
      password,
      birthday,
      gender,
      languages,
      trainingDays,
      trainingExperience,
      lat,
      lng,
    } = registerUser

    await this.checkEmailTaken(email)

    const athlete = new AthleteUser({
      fullName,
      email,
      passwordHash: password,
      birthDate: birthday,
      sex: gender,
      languages,
      trainingExperience,
      trainingDays,
      location: {
        type: 'Point',
        coordinates:
          lat && lng
            ? [parseFloat(lat + '').toFixed(6), parseFloat(lng + '').toFixed(6)]
            : [0.0, 0.0],
      },
    })

    await athlete.save()

    loggerService.info(`User succesfully created [userId: ${athlete._id}]`)

    const token = await jwtService.generate(
      TokenUtility.generatePayload(athlete),
    )

    return TokenUtility.generateResponse(token)
  }

  /**
   * Updates user profile photo
   */
  public async updateProfilePhoto(
    userId: string,
    buffer: any,
  ): Promise<UserResponse> {
    if (!ObjectIdUtility.isValid(userId)) {
      loggerService.warn(`Given object id is invalid [id: ${userId}]`)
      throw new DocumentNotFound('user.notFound')
    }

    const user = await this.baseUserModel.findById(userId)

    if (!user) {
      loggerService.warn(
        `User with given ID does not exists [userId: ${userId}]`,
      )
      throw new DocumentNotFound('user.notFound')
    }

    const fileName = await imageService.save(buffer)

    user.imageUrl = fileName
    await user.save()

    loggerService.info(
      `User profile photo has been updated. [userId: ${user._id}]`,
    )

    return Promise.resolve(UserMapper.baseUsertoDTO(user))
  }

  /**
   * Checks user exists or not
   */
  public async existsById(userId: string): Promise<boolean> {
    const doesUserExists = await this.baseUserModel.exists({
      _id: userId,
    })

    return Promise.resolve(doesUserExists ? true : false)
  }

  /**
   * Updates the gym the user goes to
   */
  public async updateGym(userId: string, gymId: string): Promise<UserResponse> {
    if (!ObjectIdUtility.isValid(gymId)) {
      loggerService.warn(`Invalid gtm ID [gymId: ${gymId}]`)
      throw new DocumentNotFound('gym.notFound')
    }

    await this.checkGymExists(gymId)

    const user = await this.baseUserModel.findById(userId)
    user.gym = gymId
    await user.save()

    loggerService.info(
      `The gym the user goes to updated [userId: ${userId}, gymId: ${gymId}]`,
    )

    return Promise.resolve(UserMapper.baseUsertoDTO(user))
  }

  /**
   * Gets the athlete by athlete id
   */
  public async getAthleteById(athleteId: string): Promise<AthleteResponse> {
    const user = await this.athleteModel.findById(athleteId)

    if (!user) {
      loggerService.warn(
        `Athlete with the given id doesn't exits [userId: ${athleteId}]`,
      )
      throw new DocumentNotFound('user.notFound')
    }

    return Promise.resolve(UserMapper.athleteToDTO(user))
  }

  /**
   * Updates athlete by id
   */
  public async updateAthlete(
    athleteId: string,
    updateAthlete: UpdateAthleteRequest,
  ): Promise<AthleteResponse> {
    const athlete = await this.athleteModel.findById(athleteId)

    if (!athlete) {
      loggerService.warn(
        `Athlete with the given id doesn't exists [athleteId: ${athleteId}]`,
      )
      throw new DocumentNotFound('athlete.notFound')
    }

    if (updateAthlete.email !== athlete.email)
      await this.checkEmailTaken(updateAthlete.email)

    athlete.fullName = updateAthlete.fullName
    athlete.email = updateAthlete.email
    athlete.birthDate = updateAthlete.birthday
    athlete.sex = updateAthlete.gender
    athlete.languages = updateAthlete.languages
    athlete.trainingExperience = updateAthlete.trainingExperience
    athlete.trainingDays = updateAthlete.trainingDays
    await athlete.save()

    loggerService.info(`The Athlete is updated [athleteId: ${athleteId}]`)

    return Promise.resolve(UserMapper.athleteToDTO(athlete))
  }

  /**
   * Gets user by id
   */
  public async getUserById(userId: string): Promise<UserResponse> {
    const user = await this.baseUserModel.findById(userId)

    if (!user) {
      loggerService.warn(
        `User with the given id doesn't exists [userId: ${userId}]`,
      )
      throw new DocumentNotFound('user.notFound')
    }

    return Promise.resolve(UserMapper.baseUsertoDTO(user))
  }

  /**
   * Updates the geo location of the athlete
   */
  public async updateLocation(
    athleteId: string,
    lat: number,
    lng: number,
  ): Promise<AthleteResponse> {
    const updateAthleteLocation = await this.athleteModel.findById(athleteId)

    updateAthleteLocation.location = {
      type: 'Point',
      coordinates: [
        parseFloat(lat + '').toFixed(6),
        parseFloat(lng + '').toFixed(6),
      ],
    }
    await updateAthleteLocation.save()

    loggerService.info(
      `The athete's location is updated [athleteId: ${athleteId}]`,
    )

    return Promise.resolve(updateAthleteLocation)
  }

  /**
   * Register personal trainer
   */
  public async registerPersonalTrainer(
    req: RegisterPersonalTrainer,
  ): Promise<TokenResponse> {
    const {
      fullName,
      email,
      password,
      birthday,
      gender,
      languages,
      yearsOfExperience,
      gym,
      iban,
    } = req

    await this.checkEmailTaken(email)

    const personalTrainer = new PersonalTrainerUser({
      fullName,
      email,
      passwordHash: password,
      birthDate: birthday,
      sex: gender,
      languages,
      iban,
      yearsOfExperience,
    })

    await personalTrainer.save()

    loggerService.info(
      `Personal trainer succesfully created [ptId: ${personalTrainer._id}]`,
    )

    const token = await jwtService.generate(
      TokenUtility.generatePayload(personalTrainer),
    )

    return TokenUtility.generateResponse(token)
  }

  /**
   * Adds certificate images
   */
  public async addCertificateImage(
    userId: string,
    files: any,
  ): Promise<UserResponse> {
    if (!ObjectIdUtility.isValid(userId)) {
      loggerService.warn(`Given object id is invalid [id: ${userId}]`)
      throw new DocumentNotFound('user.notFound')
    }

    const pt = await this.ptModel.findById(userId)

    if (!pt) {
      loggerService.warn(
        `Personal trainer with given ID does not exists [userId: ${userId}]`,
      )
      throw new DocumentNotFound('user.notFound')
    }

    files.forEach(async (file) => {
      const fileName = await imageService.save(file.buffer)

      pt.certificates = [...pt.certificates, fileName]
      await pt.save()
    })

    loggerService.info(
      `Certificate images has been updated. [userId: ${pt._id}]`,
    )

    return Promise.resolve(UserMapper.baseUsertoDTO(pt))
  }

  /**
   * Gets PT Info
   */
  public async getPTInfo(ptId: string): Promise<PTResponse> {
    const personalTrainer = await this.ptModel.findById(ptId)

    return Promise.resolve(UserMapper.personalTrainerToDTO(personalTrainer))
  }

  /**
   * Gets all personal trainers
   */
  public async getPersonalTrainers(athleteId: string): Promise<PTResponse[]> {
    const athlete = await this.athleteModel.findById(athleteId)

    if (!athlete) {
      loggerService.warn(
        `Athlete with the given id doesn't exists [athleteId: ${athleteId}]`,
      )
      throw new DocumentNotFound('athlete.notFound')
    }

    if (!athlete.canSeePersonalTrainers) {
      loggerService.warn(
        `Athlete tried to see personal trainers but not subscribed [athleteId: ${athleteId}]`,
      )
      throw new UnauthorizedError('athlete.unsubscribed')
    }

    const personalTrainers = await this.ptModel.find()

    return Promise.resolve(UserMapper.personalTrainersToDTO(personalTrainers))
  }

  /**
   * Updates personal trainer
   */
  public async updatePT(
    ptId: string,
    req: UpdatePTRequest,
  ): Promise<PTResponse> {
    const pt = await this.ptModel.findById(ptId)

    if (!pt) {
      loggerService.warn(
        `Personal trainer with the given id doesn't exists [personalTrainerId: ${ptId}]`,
      )
      throw new DocumentNotFound('personalTrainer.notFound')
    }

    if (pt.email !== req.email) await this.checkEmailTaken(req.email)

    pt.fullName = req.fullName
    pt.email = req.email
    pt.birthDate = req.birthday
    pt.sex = req.gender
    pt.languages = req.languages
    pt.iban = req.iban
    pt.gym = req.gym
    pt.yearsOfExperience = req.yearsOfExperience

    if (req.deletedCerfImages.length > 0) {
      const deletedImgs = pt.certificates.filter(
        (i) => !req.deletedCerfImages.includes(i),
      )

      pt.certificates = deletedImgs
    }

    await pt.save()

    loggerService.info(`Personal trainer updated [personalTrainerId: ${ptId}]`)

    return Promise.resolve(UserMapper.personalTrainerToDTO(pt))
  }

  /**
   * Gets packages belongs to the personal trainer
   */
  public async getMyPackages(ptId: string): Promise<PTPackageResponse[]> {
    const pt = await this.ptModel.findById(ptId)

    if (!pt) {
      loggerService.warn(
        `Personal trainer with the given id doesn't exists [personalTrainerId: ${ptId}]`,
      )
      throw new DocumentNotFound('personalTrainer.notFound')
    }

    const packages = await this.ptPackage.find({
      personalTrainer: ptId,
    })

    return Promise.resolve(SubscriptionMapper.ptPackagestoDTO(packages))
  }

  private async checkGymExists(gymId: string) {
    const gym = await gymService.getById(gymId)

    if (!gym) {
      loggerService.warn(
        `Gym with the given id doesn't exists [gymId: ${gymId}]`,
      )
      throw new DocumentNotFound('gym.notFound')
    }
  }

  private async checkEmailTaken(email: string) {
    const isEmailTaken = await this.baseUserModel.exists({ email })

    if (isEmailTaken) {
      loggerService.warn(
        `User with given email already exists [email: ${email}]`,
      )
      throw new DocumentExists('email.exists')
    }
  }
}

export default new UserService()
