require 'spec_helper'
require 'elasticsearch'

describe UnicornHelpers do
  include_context 'search_enabled'

  context("#exit_on_invalid_index") do
    subject { UnicornHelpers.exit_on_invalid_index }

    it "doesn't exit when index is valid" do
      # code 101 is special code recongnized by forum-supervisor.sh
      expect{subject}.not_to exit_with_code(101)
    end

    it "exits when index is invalid" do
      TaskHelpers::ElasticsearchHelper.delete_indices
      # code 101 is special code recongnized by forum-supervisor.sh
      expect{subject}.to exit_with_code(101)
    end

  end
end
