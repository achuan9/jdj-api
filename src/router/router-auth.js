import Router from 'koa-router';

const router = new Router();

import member from '../controllers/member';

router.get('/members', member.getMembers); // list members
router.get('/members/:id', member.getMemberById); // get member details
router.post('/members', member.postMembers); // add new member
router.patch('/members/:id', member.patchMemberById); // update member details
router.delete('/members/:id', member.deleteMemberById); // delete member

import teams from '../controllers/teams.js';

router.get('/teams', teams.getTeams); // list teams
router.get('/teams/:id', teams.getTeamById); // get team details
router.post('/teams', teams.postTeams); // add new team
router.patch('/teams/:id', teams.patchTeamById); // update team details
router.delete('/teams/:id', teams.deleteTeamById); // delete team

import teamsMembers from '../controllers/team-members.js';

router.get('/team-members/:id', teamsMembers.getTeamMemberById); // get team membership details
router.post('/team-members', teamsMembers.postTeamMembers); // add new team membership
router.delete('/team-members/:id', teamsMembers.deleteTeamMemberById); // delete team membership

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
