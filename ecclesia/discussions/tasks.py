from celery.decorators import task
from discussion_actions import evaluate_stories
from coa_discussion_actions import generate_graph
from notifications.services import create_notification
from workflow_manager import update_workflow_status

@task()
def evaluate_stories_task(discussion, graph):
    evaluate_stories(discussion, graph)
    logger = evaluate_stories_task.get_logger()
    logger.info("Calculating evaluation for %s..." % discussion.name)

@task()
def create_notification_task(text, entity, acting_user=None, recipient=None):
    create_notification(text=text, entity=entity, acting_user=acting_user, recipient=recipient)
    logger = create_notification_task.get_logger()
    logger.info("Creating notification %s..." % text)

@task()
def analyze(container, discussion):
    logger = analyze.get_logger()
    logger.info("Analyzing discussion %s..." % discussion.name)
    graph = generate_graph(discussion)
    evaluate_stories_task(discussion, graph)
    update_workflow_status(container, graph)
