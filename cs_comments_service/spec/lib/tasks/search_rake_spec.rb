require 'spec_helper'
require 'elasticsearch'

describe "search:rebuild_indices" do
  include_context "rake"

  before do
    allow(TaskHelpers::ElasticsearchHelper).to receive(:rebuild_indices)
  end

  its(:prerequisites) { should include("environment") }

  it "calls rebuild_indices with defaults" do
    expect(TaskHelpers::ElasticsearchHelper).to receive(:rebuild_indices).with(500, 5)

    subject.invoke
  end

  it "calls rebuild_indices with arguments" do
    # Rake calls receive arguments as strings.
    batch_size = '100'
    extra_catchup_minutes = '10'
    expect(TaskHelpers::ElasticsearchHelper).to receive(:rebuild_indices).with(
          batch_size.to_i, extra_catchup_minutes.to_i
    )

    subject.invoke(batch_size, extra_catchup_minutes)
  end
end

describe "search:catchup" do
  include_context "rake"
  let(:indices) { TaskHelpers::ElasticsearchHelper::index_names }
  let(:comments_index_name) { Comment.index_name }
  let(:comment_threads_index_name) { CommentThread.index_name }

  before do
    allow(TaskHelpers::ElasticsearchHelper).to receive(:catchup_indices)
  end

  its(:prerequisites) { should include("environment") }

  it "calls catchup with defaults" do
    expect(TaskHelpers::ElasticsearchHelper).to receive(:catchup_indices).with(indices, anything, 500)

    subject.invoke(comments_index_name, comment_threads_index_name)
  end

  it "calls catchup with arguments" do
    # Rake calls receive arguments as strings.
    minutes = '2'
    batch_size = '100'
    expect(TaskHelpers::ElasticsearchHelper).to receive(:catchup_indices).with(indices, anything, batch_size.to_i)

    subject.invoke(comments_index_name, comment_threads_index_name, minutes, batch_size)
  end
end
