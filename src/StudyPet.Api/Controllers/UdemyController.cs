using Microsoft.AspNetCore.Mvc;
using StudyPet.Api.Courses;

namespace StudyPet.Api.Controllers;

/// <summary>Pré-preenche o cadastro de curso a partir de um link público da Udemy.</summary>
[ApiController]
[Route("api/udemy")]
public sealed class UdemyController(UdemyPreviewService udemy) : ControllerBase
{
    [HttpPost("preview")]
    public async Task<IActionResult> Preview(UdemyPreviewRequest request, CancellationToken cancellationToken)
    {
        if (!UdemyPreviewService.TryNormalize(request.Url, out var url))
        {
            return BadRequest(new
            {
                message = "Cole o link de um curso da Udemy, no formato https://www.udemy.com/course/nome-do-curso/."
            });
        }

        var preview = await udemy.PreviewAsync(url, cancellationToken);
        return Ok(preview);
    }
}
