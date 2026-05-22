"""Remove obsolete algorithm

Revision ID: b7c1e0f5a6d2
Revises: 80b94d5586fe
Create Date: 2026-05-22 00:00:00.000000

"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "b7c1e0f5a6d2"
down_revision = "80b94d5586fe"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE aialgorithm RENAME TO aialgorithm_old")
    op.execute("CREATE TYPE aialgorithm AS ENUM ('RANDOM', 'ALPHABETA', 'MONTECARLO')")
    op.execute(
        "ALTER TABLE aiconfig ALTER COLUMN algorithm TYPE aialgorithm "
        "USING algorithm::text::aialgorithm"
    )
    op.execute("DROP TYPE aialgorithm_old")


def downgrade():
    op.execute("ALTER TYPE aialgorithm RENAME TO aialgorithm_old")
    op.execute(
        "CREATE TYPE aialgorithm AS ENUM "
        "('RANDOM', 'ALPHABETA', 'MONTECARLO')"
    )
    op.execute(
        "ALTER TABLE aiconfig ALTER COLUMN algorithm TYPE aialgorithm "
        "USING algorithm::text::aialgorithm"
    )
    op.execute("DROP TYPE aialgorithm_old")
