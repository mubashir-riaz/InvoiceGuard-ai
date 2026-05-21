# worker/main.py
# ARQ worker entry point.
# Defines the WorkerSettings class that ARQ uses to discover tasks and configuration.
from arq.connections import RedisSettings
from worker.config import REDIS_URL

# Import task functions so ARQ can register them
from worker.tasks.sample import sample_task


class WorkerSettings:
    """
    ARQ Worker configuration.
    - functions: list of async task coroutines the worker can execute.
    - redis_settings: connection parameters.
    """
    functions = [sample_task]
    redis_settings = RedisSettings.from_dsn(REDIS_URL)
    # For development, use --watch flag to auto-reload on code changes