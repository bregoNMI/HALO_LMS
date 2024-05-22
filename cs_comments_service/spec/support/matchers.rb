require 'rspec/expectations'

RSpec::Matchers.define :be_an_empty_response do
  match do |actual|
    actual.body == '{}'
  end
end

RSpec::Matchers.define :exit_with_code do |exp_code|
  supports_block_expectations
  actual = nil

  match do |block|
    begin
      block.call
    rescue SystemExit => e
      actual = e.status
    end
    actual and actual == exp_code
  end
  failure_message do |block|
    "expected block to call exit(#{exp_code}) but exit" +
        (actual.nil? ? " not called" : "(#{actual}) was called")
  end
  failure_message_when_negated do |block|
    "expected block not to call exit(#{exp_code})"
  end
  description do
    "expect block to call exit(#{exp_code})"
  end
end
