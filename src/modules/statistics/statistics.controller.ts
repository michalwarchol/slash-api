import { Controller, Get, Request, UseGuards } from "@nestjs/common";

import { AuthGuard } from "src/guards/authGuard";
import { UserType } from "src/types/users";

import { EducatorStats, StudentStats } from './statistics.dto';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @UseGuards(AuthGuard)
  @Get('/')
  createCourse(
    @Request() req,
  ): Promise<EducatorStats | StudentStats> {
    if (req.user.type === UserType.EDUCATOR) {
      return this.statisticsService.getEducatorStats(req.user.id);
    } else {
      return this.statisticsService.getStudentStats();
    }
  }
}
