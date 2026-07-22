using System;
using System.Collections.Generic;
using Platform.Application.Features.Tasks.Dtos;

namespace Platform.Application.Features.Sessions.Dtos;

public class SessionDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsUnlocked { get; set; }
    public List<ProgrammingTaskDto> Tasks { get; set; } = new();
}

public class CreateSessionDto
{
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
}
