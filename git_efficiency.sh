#!/bin/bash

# Debug function
debug() {
    echo "[DEBUG] $1" >&2
}

# Check if times.txt exists and is readable
if [ ! -f "times.txt" ]; then
    echo "Error: times.txt not found!"
    exit 1
fi

if [ ! -r "times.txt" ]; then
    echo "Error: times.txt is not readable!"
    exit 1
fi

# Usage function
usage() {
    echo "Usage: $0 start_date [end_date]"
    echo "Format: YYYY-MM-DD"
    echo "If end_date is not provided, current date will be used"
    exit 1
}

# Validate date format
validate_date() {
    # Check if the date matches YYYY-MM-DD format using regex
    if [[ ! $1 =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        echo "Invalid date format: $1"
        echo "Please use YYYY-MM-DD format"
        usage
    fi

    # Extract year, month, and day
    year=${1:0:4}
    month=${1:5:2}
    day=${1:8:2}

    # Basic validation of month and day
    if [ "$month" -lt 1 ] || [ "$month" -gt 12 ] || [ "$day" -lt 1 ] || [ "$day" -gt 31 ]; then
        echo "Invalid date: $1"
        usage
    fi
}

# Check arguments
if [ $# -lt 1 ] || [ $# -gt 2 ]; then
    usage
fi

start_date=$1
validate_date "$start_date"

if [ $# -eq 2 ]; then
    end_date=$2
    validate_date "$end_date"
else
    end_date=$(date +%Y-%m-%d)
fi

debug "Date range: $start_date to $end_date"

# Function to get commit stats
get_commit_stats() {
    local commit_hash=$1
    debug "Processing commit: $commit_hash"
    git show --numstat "$commit_hash" 2>/dev/null | grep -E '\.(py|ts|tsx|js|jsx)$' | \
        grep -Ev '(generated\.ts|/components/ui/)' | \
        awk '{add+=$1; del+=$2} END {if(NR>0) print add "\t" del; else print "0\t0"}'
}

# Process each commit
total_hours=0
total_additions=0
total_deletions=0

while IFS=$'\t' read -r date hours commit_hash description; do
    # Skip empty lines and malformed entries
    [ -z "$date" ] && continue

    debug "Processing line: $date $hours $commit_hash"

    # Check if date is within range
    if [[ ! ("$date" < "$start_date") ]] && [[ ! ("$date" > "$end_date") ]]; then
        # Get stats only if commit hash is valid
        if [[ $commit_hash =~ ^[0-9a-f]{7,40}$ ]]; then
            stats=$(get_commit_stats "$commit_hash")
            additions=$(echo "$stats" | cut -f1)
            deletions=$(echo "$stats" | cut -f2)

            total_hours=$(echo "$total_hours + $hours" | bc)
            total_additions=$(($total_additions + $additions))
            total_deletions=$(($total_deletions + $deletions))

            printf "%s: %.2f hours, +%d/-%d lines (%s: %s)\n" \
                "$date" "$hours" "$additions" "$deletions" "$commit_hash" "$description"
        else
            debug "Skipping invalid commit hash: $commit_hash"
        fi
    else
        debug "Date $date outside range $start_date to $end_date"
    fi
done < "times.txt"

# Calculate metrics
total_lines=$(($total_additions + $total_deletions))
if [ $total_lines -gt 0 ]; then
    hours_per_line=$(echo "scale=3; $total_hours / $total_lines" | bc)
    lines_per_hour=$(echo "scale=1; $total_lines / $total_hours" | bc)
else
    hours_per_line=0
    lines_per_hour=0
fi

# Print summary
echo ""
echo "=== Summary ==="
echo "Period: $start_date to $end_date"
echo "Total hours: $total_hours"
echo "Total lines changed: $total_lines (+$total_additions/-$total_deletions)"
echo "Hours per line: $hours_per_line"
echo "Lines per hour: $lines_per_hour"