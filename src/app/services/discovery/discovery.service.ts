/**
 * @module app.services.discovery
 */

import { InteractionError } from '@app/exceptions/interaction-error'
import { UserMapper } from '@app/mappers/user.mapper'
import { AthleteUser } from '@app/model/user/Athlete'
import { AthleteResponse } from '@app/types/response.types'
import { Model, Mongoose, Types } from 'mongoose'
import loggerService from '../logger/logger-service'
import queryParserService from '../query-parser/query-parser.service'

/**
 * Discovery Service
 * @class
 * @alias app.services.discovery.DiscoveryService
 */
class DiscoveryService {
  private athleteModel: Model<any>

  constructor() {
    this.athleteModel = AthleteUser
  }

  /**
   * Gets athletes for the discovery
   * Results are filtered by given criterias
   */
  public async discover(
    rawQuery: any,
    userId: string,
  ): Promise<AthleteResponse[]> {
    const query = await queryParserService.parse(rawQuery)

    const athlete = await this.athleteModel.findById(userId)

    if (athlete.remaningLike == null || athlete.remaningLike === 0) {
      loggerService.error(
        `The athlete has reached the like limit. [athleteId: ${athlete._id}]`,
      )
      throw new InteractionError('interaction.insufficientLimit')
    }

    const distance = query.filter.distance

    const filterWithoutDistance = Object.keys(query.filter)
      .filter((key) => key !== 'distance')
      .reduce((obj, key) => {
        obj[key] = query.filter[key]
        return obj
      }, {})

    const athletes = await this.athleteModel
      .find({
        _id: {
          $ne: userId,
        },
        interactedBy: {
          $nin: [new Types.ObjectId(userId)],
        },
        ...filterWithoutDistance,
        ...(distance && {
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [...athlete.location.coordinates],
              },
              //    $minDistance: 1000,
              $maxDistance: distance * 1000,
            },
          },
        }),
      })
      .limit(2)

    return Promise.resolve(UserMapper.athletesToDTO(athletes))
  }
}

export default new DiscoveryService()
