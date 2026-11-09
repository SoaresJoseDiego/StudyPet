using StudyPet.Application;

namespace StudyPet.Application.Tests;

public class DailyGoalTests
{
    [Theory]
    [InlineData(0, 25, 60, false)]  // ainda não chegou
    [InlineData(50, 10, 60, true)]  // esta sessão cruza a meta
    [InlineData(0, 60, 60, true)]   // bate a meta exata numa sessão só
    [InlineData(60, 10, 60, false)] // meta já tinha sido batida: bônus não repete
    public void Bonus_only_for_the_session_that_crosses_the_goal(int before, int session, int goal, bool expected)
    {
        Assert.Equal(expected, DailyGoal.IsCompletedBy(before, session, goal));
    }
}
