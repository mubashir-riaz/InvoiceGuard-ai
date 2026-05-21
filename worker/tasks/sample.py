# A minimal async task to verify the worker is functioning.
# This just prints to the worker logs.
import logging

logger = logging.getLogger(__name__)

async def sample_task(ctx, text: str) -> str:
    """
    Simple test task.
    Args:
        ctx: ARQ job context
        text: any string
    Returns:
        echoed text
    """
    logger.info(f"Sample task received: {text}")
    return f"Echo: {text}"